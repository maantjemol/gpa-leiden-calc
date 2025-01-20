<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import { Textarea } from '$lib/components/ui/textarea';
	import { fade } from 'svelte/transition';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button';
	import { ArrowUp, Minus, Plus } from 'lucide-svelte';
	import { parseCourseData, type Course } from '$lib/course';
	import { browser } from '$app/environment';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { VisXYContainer, VisLine, VisAxis, VisScatter } from '@unovis/svelte';
	// import { data } from './data'

	let inputString = $state('');

	let selectedCourse = $state('');
	let dialogCourse = $state<Course>();
	let diaglogOpen = $state(false);
	let dialogCredits = $state<number>(-1);

	let courseData = $state<Course[]>(
		browser ? JSON.parse(localStorage.getItem('courseData') || '[]') : []
	);
	let loading = $state(false);

	let timeseries = $derived.by(() => {
		let data = [];
		let i = 0;
		let average = 0;

		for (let course of courseData) {
			if (course.date && course.grade && course.credits) {
				if (course.grade === 'Passed') continue;
				let newAverage = (average * i + course.grade) / (i + 1);

				let dateParts = course.date.split('-');
				let dateObject = new Date(+dateParts[2], +dateParts[1] - 1, +dateParts[0]);

				// create number from date string (2021-09-01), parse it to Date object
				data.push({ x: dateObject.getTime(), y: newAverage, label: course.courseName });
				average = newAverage;
				i++;
			}
		}
		return data;
	});

	$inspect(timeseries);

	$effect(() => {
		if (loading) return;
		localStorage.setItem('courseData', JSON.stringify(courseData));
	});

	const handleSubmitCourseData = async (input: string) => {
		loading = true;
		const data = await parseCourseData(input);
		loading = false;
		if (!data) return;
		courseData = data;
	};

	let gpa = $derived.by(() => {
		let totalCredits = 0;
		let totalGrade = 0;
		for (let course of courseData) {
			if (course.credits && course.grade) {
				totalCredits += course.credits;
				// handle passed:
				if (course.grade === 'Passed') {
					totalGrade += course.credits * 10;
				} else {
					totalGrade += course.credits * course.grade;
				}
			} else {
				return null;
			}
		}
		return totalGrade / totalCredits;
	});

	const padding = {
		top: 5,
		bottom: 5
	};
</script>

{#if courseData.length === 0}
	<section
		class="container flex h-screen max-w-prose flex-col items-center justify-center gap-4 pb-16"
	>
		<h1 class="text-center text-4xl font-bold">Calculate your Leiden GPA</h1>
		<a
			href="https://mijn.universiteitleiden.nl/results/latest"
			class="mb-4 text-center text-blue-500 underline"
			target="_blank">Copy your results from here</a
		>
		<!-- svelte-ignore a11y_media_has_caption -->
		<video src="/tutorial.webm" autoplay loop class="rounded-md border border-secondary"></video>
		<Textarea
			placeholder="Paste your results from Student portal here..."
			bind:value={inputString}
			onpaste={(e) => {
				if (!e.clipboardData) return;
				const text = e.clipboardData.getData('text/plain');
				handleSubmitCourseData(text);
			}}
			disabled={loading}
		/>
		<Button
			onclick={() => handleSubmitCourseData(inputString)}
			disabled={loading}
			class={loading ? 'pulse' : ''}>{loading ? 'Loading...' : 'Search and Calculate'}</Button
		>
	</section>
{:else}
	<section class="container flex flex-col items-center gap-4 pt-16">
		<h1 class="text-center text-4xl font-bold">
			{gpa ? 'Your GPA' : 'Fill out all the credits selections'}
		</h1>
		<div class="mt-4 flex-1 rounded-md border border-secondary p-4 text-center shadow-sm">
			<div class="text-7xl font-bold tracking-tighter">
				{gpa === null ? '?' : gpa.toFixed(1)}
			</div>
			<div class="text-[0.70rem] uppercase text-muted-foreground">
				{gpa ? 'Your GPA' : 'Please fill out all the credit selections'}
			</div>
		</div>

		<Button
			onclick={() => {
				courseData = [];
				localStorage.removeItem('courseData');
			}}>Clear all courses</Button
		>
	</section>
{/if}

{#if courseData.length > 0}
	<section class="container max-w-prose py-16" transition:fade>
		<h2 class="pb-4 text-center font-bold">GPA progression</h2>
		{#key timeseries}
			<VisXYContainer yDomain={[0, 10]} {padding}>
				<VisLine data={timeseries} x={(d) => d.x} y={(d) => d.y} />
				<VisScatter
					data={timeseries}
					x={(d) => d.x}
					y={(d) => d.y}
					color={'#8EB1F3'}
					size={6}
					label={(d: { y: number }) => d.y.toFixed(1)}
				/>
				<VisAxis
					type="x"
					label="Date"
					numTicks={6}
					tickFormat={(value: number) => Intl.DateTimeFormat().format(value)}
				/>
				<VisAxis type="y" />
			</VisXYContainer>
		{/key}

		<h2 class="pb-4 pt-12 text-center font-bold">Courses</h2>
		<Table.Root>
			<Table.Caption>All the courses</Table.Caption>
			<Table.Header class="sticky top-0">
				<Table.Row>
					<Table.Head>Course name</Table.Head>
					<Table.Head>Credits</Table.Head>
					<Table.Head class="text-right">Grade</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body class="overflow-y-auto">
				{#each courseData as course}
					<Table.Row>
						<Table.Cell>{course.courseName}</Table.Cell>
						<Table.Cell>
							{#if course.credits}
								<span>
									{course.credits} EC
								</span>
							{:else}
								<div>
									<button
										class="w-min text-nowrap font-medium text-red-400"
										onclick={() => {
											dialogCourse = course;
											diaglogOpen = true;
											selectedCourse = dialogCourse.possibleCourses?.[0]?.courseName || '';
											dialogCredits = dialogCourse.possibleCourses?.[0]?.ec || -1;
										}}>Select course</button
									>
								</div>
							{/if}
						</Table.Cell>
						<Table.Cell class="text-right">{course.grade}</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
			<Table.Footer>
				<Table.Row>
					<Table.Cell>Total</Table.Cell>
					<Table.Cell class="text-left"
						>{courseData.reduce((a, b) => a + (b.credits || 0), 0)} EC</Table.Cell
					>
					<Table.Cell class="text-right">-</Table.Cell>
				</Table.Row>
			</Table.Footer>
		</Table.Root>
		<!-- </ScrollArea> -->
		<div class="mt-4 flex items-center justify-center">
			<!-- To the top -->
			<Button
				variant="outline"
				size="icon"
				class="size-8 shrink-0 rounded-full"
				onclick={() => {
					window.scrollTo({ top: 0, behavior: 'smooth' });
				}}
			>
				<ArrowUp />
				<span class="sr-only">To the top</span>
			</Button>
		</div>
	</section>
{/if}

<!-- {#if dialogCourse} -->
<Dialog.Root bind:open={diaglogOpen} on:close={() => (dialogCourse = undefined)}>
	{#if dialogCourse}
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>{dialogCourse.courseName}</Dialog.Title>
				<Dialog.Description
					>We couldn't find a fully matching course. Please <bold class="font-bold"
						>select the correct one</bold
					>
					from the dropdown, or <bold class="font-bold">input the amount of EC</bold> yourself</Dialog.Description
				>
			</Dialog.Header>
			{#if dialogCourse.possibleCourses}
				<Select.Root type="single" name="favoriteFruit" bind:value={selectedCourse}>
					<Select.Trigger class="truncate text-nowrap">
						{selectedCourse || 'Select course or input EC'}
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.GroupHeading>Courses</Select.GroupHeading>
							{#each dialogCourse.possibleCourses as possibleCourse}
								<Select.Item
									value={`${possibleCourse.courseName} | ${possibleCourse.ec} EC`}
									label={`${possibleCourse.courseName} | ${possibleCourse.ec} EC`}
									onclick={() => {
										dialogCredits = possibleCourse.ec;
									}}>{possibleCourse.courseName} | {possibleCourse.ec} EC</Select.Item
								>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
				<div class="flex items-center justify-center space-x-2">
					<Button
						variant="outline"
						size="icon"
						class="size-8 shrink-0 rounded-full"
						onclick={() => dialogCredits--}
						disabled={dialogCredits <= 0}
					>
						<Minus />
						<span class="sr-only">Decrease</span>
					</Button>
					<div class="flex-1 text-center">
						<div class="text-7xl font-bold tracking-tighter">
							{dialogCredits === -1 ? '?' : dialogCredits}
						</div>
						<div class="text-[0.70rem] uppercase text-muted-foreground">EC</div>
					</div>
					<Button
						variant="outline"
						size="icon"
						class="size-8 shrink-0 rounded-full"
						onclick={() => dialogCredits++}
					>
						<Plus />
						<span class="sr-only">Increase</span>
					</Button>
				</div>
				<div class="mt-4 flex justify-end">
					<Button
						onclick={() => {
							if (!dialogCourse) return;
							dialogCourse.credits = dialogCredits;
							diaglogOpen = false;
						}}>Save</Button
					>
				</div>
			{/if}
		</Dialog.Content>
	{/if}
</Dialog.Root>
