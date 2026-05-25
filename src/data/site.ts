// ---------------------------------------------------------------------------
// Site-level UI data for the header and the home "collection" hero.
// Kept separate from prompt content; safe to tweak without touching the data
// layer. (Avatars reuse the original gallery assets.)
// ---------------------------------------------------------------------------

export interface CurrentUser {
	name: string;
	avatar: string;
	streak: string;
	energy: string;
}

export const currentUser: CurrentUser = {
	name: 'Boopul',
	avatar:
		'https://lh3.googleusercontent.com/aida-public/AB6AXuAHJkJ_si2C1as6RpoPYt-vbYY29Ap_hNsPStT-dlLLrcxGiU3LijgWFtKs-GQ4ihaD6nwPFRxgvCZ8uCr4BGWAcMnqTF7MgdpUmY76rdWIgbyJtM0ZCElyGOpGnes0iNewKK4T11ArJnsIn1Omey5JSu6GIWK94TnEAk8wPTplINtmYTW_oWncFrQxjAQR3Bxkb5QttVL4iRX66tY3UDNLmfKU0aw5iyBwyTegAh5Op3u-xhl2TYUKTrKMtrR5qaSW10BTdZyPCRU',
	streak: '1,331',
	energy: '15.8K',
};

export const collection = {
	title: 'Free Prompt Base',
	description: 'Ready-to-use AI prompts for ChatGPT, Midjourney, Claude & Gemini. Copy, paste, create.',
	curator: {
		name: 'Boopul',
		avatar:
			'https://lh3.googleusercontent.com/aida-public/AB6AXuDhBC3fjEK7POG1cJBPZF3lMIIOaj48CxohRNiNFrNusrJx_c3zcLW77QwcSf8cp0Tkkd_JMh3w2B4Xn8OwGKWWgOMMRwUOp1px_cih1TCjVod9gQlhZY2f1wZxv--teXEZVgHY3UP_wkbnxOfjY1lYVxVblHc9RCL8gh8iAzoMMo7YWngNXQCl9x2gKTBbOZBDf5H0_DorMrkDkXES3yUaOt9tZapIWSuX3zHaJzXy6Aw8OZsyJ_ywhCN1iXv7lZJFfAVw5vpvbag',
	},
};
