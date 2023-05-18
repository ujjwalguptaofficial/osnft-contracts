import { IDeployedPayload } from "./interfaces";
import { expect } from "chai";


export function testContractEarning(payload: IDeployedPayload) {

    it('check contract earning', async () => {
        const nft = payload.nft;
        const earning = await nft.getContractEarning(
            payload.erc20Token1.address
        );
        const earningForToken2 = await nft.getContractEarning(
            payload.erc20Token2.address
        );
        expect(earning).to.greaterThan(0);
        expect(earningForToken2).to.greaterThan(0);
    })

    it('withdraw earning more than available', async () => {
        const nft = payload.nft;

        const earningForToken1 = await nft.getContractEarning(
            payload.erc20Token1.address
        );


        const tx = nft.withdrawEarning(payload.erc20Token1.address, earningForToken1.add(1));

        await expect(tx).to.revertedWith(`Amount exceed earning`);

    })

    it('withdraw earning successful for erc20token1', async () => {
        const nft = payload.nft;

        const earning = await nft.getContractEarning(
            payload.erc20Token1.address
        );

        const tx = nft.withdrawEarning(payload.erc20Token1.address, earning);

        await expect(tx).to.emit(payload.erc20Token1, `Transfer`).withArgs(
            nft.address, payload.deployer.address, earning
        )

        const earningAfter = await nft.getContractEarning(
            payload.erc20Token1.address
        );
        expect(earningAfter).equal(0);
    })

    it('withdraw earning successful for erc20token2', async () => {
        const nft = payload.nft;

        const earning = await nft.getContractEarning(
            payload.erc20Token2.address
        );

        const tx = nft.withdrawEarning(payload.erc20Token2.address, earning);

        await expect(tx).to.emit(payload.erc20Token2, `Transfer`).withArgs(
            nft.address, payload.deployer.address, earning
        )

        const earningAfter = await nft.getContractEarning(
            payload.erc20Token2.address
        );
        expect(earningAfter).equal(0);
    })
}