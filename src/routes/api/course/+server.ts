import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as cheerio from 'cheerio';

export type CourseResponse = {
    found: true;
    ec: number;
} | {
    found: false;
    possibleCourses: { courseName: string, ec: number }[];
};

export const GET: RequestHandler = async ({ url }) => {
    const course = url.searchParams.get('q');
    const edition = url.searchParams.get('edition');

    if (!course || !edition)
        return error(400, 'Missing query parameters');

    const courseURL = `https://studiegids.universiteitleiden.nl/search?for=courses&q=${course.replaceAll(' ', '+')}&edition=${edition}`

    const response = await fetch(courseURL);

    const html = cheerio.load(await response.text());
    const tr = html('tr.exact');

    if (tr.find("td").length !== 3) {
        const rows = html('table.results.course-list tbody tr');

        // Define an array to store the course details
        const courses: { courseName: string, ec: number }[] = [];

        // Iterate over each row to extract course name and EC
        rows.each((index, row) => {
            const courseName = html(row).find('td a').text().trim();
            const ec = Number(html(row).find('td').eq(1).text().trim())
            if (isNaN(ec)) return;
            courses.push({ courseName, ec });
        });

        // sort the possible courses by if the first course letter is the same as the course letter
        courses.sort((a, b) => {
            if (a.courseName[0] === course[0]) return -1;
            if (b.courseName[0] === course[0]) return 1;
            return 0;
        });

        return json({ found: false, possibleCourses: courses });
    }

    const ec = Number(tr.find('td').eq(1).text().trim())

    console.log(ec, course, edition);

    return json({ found: true, ec });
};