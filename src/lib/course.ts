import type { CourseResponse } from "../routes/api/course/+server";

export type Course = {
    courseName: string;
    grade: number | 'Passed';
    credits?: number;
    date: string;
    possibleCourses?: { courseName: string; ec: number }[];
};

const cleanUpCourseName = (courseName: string) => {
    const blacklist = [
        '(Examination)',
        'Exam',
        'Others',
        '-Other',
        '- TEN',
        '-T',
        '- T',
        '-X',
        'Endgrade'
    ];

    let cleanedCourseName = courseName;
    blacklist.forEach((word) => {
        cleanedCourseName = cleanedCourseName.replace(word, '');
    });
    return cleanedCourseName.trim();
};

const findCourseInfo = async (courseName: string, date: string) => {
    // A year is from september to september
    const year = Number(date.split('-')[2]);
    // Check if it is before or after september
    const last = Number(date.split('-')[1]) < 9;
    // If it is before september, the year is the year before
    const edition = last ? `${year - 1}-${year}` : `${year}-${year + 1}`;

    const response = await fetch(
        `/api/course?q=${courseName.replaceAll(' ', '+')}&edition=${edition}`
    );

    const data: CourseResponse = await response.json();
    return data;
};

export const parseCourseData = async (data: string) => {
    const courseData: Course[] = [];

    if (!data || data.length === 0) return;

    const splitData = data.split('\n');

    if (splitData.length < 3) return;

    const initialDate = splitData.findIndex((line) => line.match(/\d{2}-\d{2}-\d{4}/));
    for (let i = initialDate; i < splitData.length; i += 3) {
        const date = splitData[i];
        const courseName = cleanUpCourseName(splitData[i + 1]);

        const grade = splitData[i + 2].includes('Passed')
            ? 'Passed'
            : parseFloat(splitData[i + 2].replace(',', '.'));
        const credits = 6; // implement function to get credits

        // use promise to get course info

        const info = await findCourseInfo(courseName, date)

        if (info.found) {
            courseData.push({ courseName, grade, credits, date });
        } else {
            courseData.push({
                courseName,
                grade,
                date,
                possibleCourses: info.possibleCourses
            });
        }
    }

    // sort by date from newest to oldest
    courseData.sort((a, b) => {
        const aDate = a.date.split('-').reverse().join('');
        const bDate = b.date.split('-').reverse().join('');
        return bDate.localeCompare(aDate);
    });

    // remove duplicate names and take the highest grade
    const uniqueCourseData: Course[] = [];
    courseData.forEach((course) => {
        const index = uniqueCourseData.findIndex(
            (uniqueCourse) => uniqueCourse.courseName === course.courseName
        );
        if (index === -1) {
            uniqueCourseData.push(course);
        } else {
            if (course.grade === 'Passed' || uniqueCourseData[index].grade === 'Passed') {
                uniqueCourseData[index].grade = 'Passed';
            } else if (course.grade > uniqueCourseData[index].grade) {
                uniqueCourseData[index].grade = course.grade;
            }
        }
    });

    return uniqueCourseData;
};