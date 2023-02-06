import { expect } from "chai";
import { IDeployedPayload } from "../interfaces";

export function testPayableToken(payload: IDeployedPayload) {
    it("add payable by non owner", async () => {
        const marketplace = payload.marketplace;
        const tx = marketplace.connect(payload.signer2).addPayableTokens(
            [payload.signer2.address]
        );
        await expect(tx).revertedWith('Ownable: caller is not the owner')
    })

    it("remove payable by non owner", async () => {
        const marketplace = payload.marketplace;
        const tx = marketplace.connect(payload.signer2).removePayableToken(
            payload.signer2.address
        );
        await expect(tx).revertedWith('Ownable: caller is not the owner')
    })

    it("isPayableToken by non owner", async () => {
        const marketplace = payload.marketplace;
        const tx = await marketplace.connect(payload.signer2).isPayableToken(
            payload.signer2.address
        );
        expect(tx).equal(false);
    })

    it("add payable", async () => {
        const marketplace = payload.marketplace;
        const tokenAddress = payload.erc20Token1.address;
        const tx = await marketplace.addPayableTokens(
            [tokenAddress]
        );
        const isPayableToken = await marketplace.isPayableToken(
            tokenAddress
        );
        expect(isPayableToken).equal(true);
    })

    it("remove payable", async () => {
        const marketplace = payload.marketplace;
        const tokenAddress = payload.signer4.address;
        let tx = await marketplace.addPayableTokens(
            [tokenAddress]
        );
        let isPayableToken = await marketplace.isPayableToken(
            tokenAddress
        );
        expect(isPayableToken).equal(true);

        tx = await marketplace.removePayableToken(
            tokenAddress
        );
        isPayableToken = await marketplace.isPayableToken(
            tokenAddress
        );
        expect(isPayableToken).equal(false);

    })

    it("add payable - token2", async () => {
        const marketplace = payload.marketplace;
        const tokenAddress = payload.erc20Token2.address;
        const isPayableTokenBefore = await marketplace.isPayableToken(
            tokenAddress
        );
        expect(isPayableTokenBefore).equal(false);
        const tx = await marketplace.addPayableTokens(
            [tokenAddress]
        );
        const isPayableToken = await marketplace.isPayableToken(
            tokenAddress
        );
        expect(isPayableToken).equal(true);
    })


}
