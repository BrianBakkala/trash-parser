import * as holden from './holden.js';

export default {
	async fetch(request)
	{
		const url = new URL(request.url);

		const holdenMessage = await holden.message();

		const pathMap =
		{
			"/": { message: "Please select a town" },
			"/holden": { town: "holden", message: holdenMessage, answer: "no" },
			"/clinton": { town: "clinton", message: "hello", answer: "yes" },
		};

		if (pathMap[url.pathname])
		{
			return new Response(JSON.stringify(pathMap[url.pathname]), {
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(JSON.stringify({ error: "Not Found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});

	},
};
