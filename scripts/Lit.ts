import * as LitJsSdk from "@lit-protocol/lit-node-client";

const client = new LitJsSdk.LitNodeClient({
	litNetwork: "cayenne",
});
const chain = "ethereum";

class Lit {
	private litNodeClient;

	async connect() {
		await client.connect();
		this.litNodeClient = client;
	}
}

export default new Lit();
