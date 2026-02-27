
import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.INDIAN_KANOON_API_KEY;

if (!API_KEY) {
    console.error("No API Key found!");
    process.exit(1);
}

const BASE_URL = "https://api.indiankanoon.org";

async function testSearch() {
    try {
        console.log("Testing Indian Kanoon Search (POST)...");

        // The API might expect form-data or just query params on POST
        // Trying query params on POST url
        const res = await fetch(`${BASE_URL}/search/?formInput=bail+application`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${API_KEY}`,
                // 'Content-Type': 'application/x-www-form-urlencoded' // Might be needed if body
            }
        });

        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Raw Response Snippet:", text.substring(0, 500));

        try {
            const data = JSON.parse(text);
            if (data && data.docs) {
                console.log(`SUCCESS: Found ${data.docs.length} docs.`);
                console.log("First Doc Title:", data.docs[0].title);
            }
        } catch (e) {
            console.log("Response might not be JSON.");
        }

    } catch (e: any) {
        console.error("Fetch Failed:", e.message);
    }
}

async function testDocFetch(docId: string) {
    try {
        console.log(`Testing Indian Kanoon Doc Fetch for ID: ${docId} ...`);

        const res = await fetch(`${BASE_URL}/doc/${docId}/`, {
            method: 'POST', // Documentation says POST for signed requests, but often simple token auth works with GET too? Docs say "Requests to the API services can be authenticated either using the shared API token...". Let's stick to POST with Token if that's what we used for search. Wait, Search used POST. Let's try POST first as per existing pattern.
            headers: {
                'Authorization': `Token ${API_KEY}`,
                'Accept': 'application/json' // Explicitly request JSON
            }
        });

        console.log("Doc Status:", res.status);
        const text = await res.text();

        try {
            const data = JSON.parse(text);
            if (data) {
                console.log(`SUCCESS: Fetched Doc.`);
                console.log("Title:", data.title);
                console.log("Doc snippet:", data.doc ? data.doc.substring(0, 200) + "..." : "No doc content");
            }
        } catch (e) {
            console.log("Response might not be JSON:", text.substring(0, 500));
        }

    } catch (e: any) {
        console.error("Doc Fetch Failed:", e.message);
    }
}

// Run tests
async function main() {
    await testSearch();
    // Example ID: 123456 (Placeholder, better to use a real one found in search)
    // We can't know a real ID without search. 
    // Let's modify testSearch to return an ID.
}

// Modifying testSearch to return an ID
async function testSearchAndDoc() {
    try {
        console.log("Testing Indian Kanoon Search (POST)...");
        const res = await fetch(`${BASE_URL}/search/?formInput=bail+application`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${API_KEY}`,
            }
        });

        const text = await res.text();
        const data = JSON.parse(text);

        if (data && data.docs && data.docs.length > 0) {
            const firstDoc = data.docs[0];
            console.log(`Found doc: ${firstDoc.title} (ID: ${firstDoc.tid})`);

            // Now fetch it
            await testDocFetch(firstDoc.tid);
        } else {
            console.log("No docs found to test fetch.");
        }

    } catch (e: any) {
        console.error("Chain Test Failed:", e.message);
    }
}

testSearchAndDoc();
