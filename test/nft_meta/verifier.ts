import { IDeployedPayload } from "../interfaces";
import { expect } from "chai";


export function testVerifier(payload: IDeployedPayload) {

    describe("add minter", () => {

        it('not by owner', async () => {
            const nft = payload.nftMeta;

            let isVerifier = await nft.isVerifier(payload.deployer.address);
            expect(isVerifier).equal(false);

            const tx = nft.connect(payload.signer4).addVerifier(payload.deployer.address);

            await expect(tx).to.revertedWith('Ownable: caller is not the owner')
        })

        it('success', async () => {
            const nft = payload.nftMeta;

            let isVerifier = await nft.isVerifier(payload.deployer.address);
            expect(isVerifier).equal(false);

            const tx = nft.addVerifier(payload.deployer.address);


            await expect(tx).to.emit(nft, "VerifierAdded").withArgs(payload.deployer.address);

            isVerifier = await nft.isVerifier(payload.deployer.address);
            expect(isVerifier).equal(true);
        })

        it('success', async () => {
            const nft = payload.nftMeta;

            let isVerifier = await nft.isVerifier(payload.operator.address);
            expect(isVerifier).equal(false);

            const tx = nft.addVerifier(payload.operator.address);


            await expect(tx).to.emit(nft, "VerifierAdded").withArgs(payload.operator.address);

            isVerifier = await nft.isVerifier(payload.operator.address);
            expect(isVerifier).equal(true);
        })

        it('success', async () => {
            const nft = payload.nftMeta;

            let isVerifier = await nft.isVerifier(payload.signer3.address);
            expect(isVerifier).equal(false);

            const tx = nft.addVerifier(payload.signer3.address);


            await expect(tx).to.emit(nft, "VerifierAdded").withArgs(payload.signer3.address);

            isVerifier = await nft.isVerifier(payload.signer3.address);
            expect(isVerifier).equal(true);
        })

        it('success', async () => {
            const nft = payload.nftMeta;

            const verifierAddress = "0xcAd234A659c41A6070353D67b3A85a15FDD9Ab37".toLowerCase();

            let isVerifier = await nft.isVerifier(verifierAddress);
            expect(isVerifier).equal(false);

            const tx = nft.addVerifier(verifierAddress);


            await expect(tx).to.emit(nft, "VerifierAdded")
            // .withArgs(verifierAddress);

            isVerifier = await nft.isVerifier(verifierAddress);
            expect(isVerifier).equal(true);
        })
    })

    describe("remove minter", () => {

        it('not by owner', async () => {
            const nft = payload.nftMeta;
            const tx = nft.connect(payload.signer4).removeVerifier(payload.deployer.address);

            await expect(tx).to.revertedWith('Ownable: caller is not the owner')
        })

        it('success', async () => {
            const nft = payload.nftMeta;

            let isVerifier = await nft.isVerifier(payload.signer3.address);
            expect(isVerifier).equal(true);

            const tx = nft.removeVerifier(payload.signer3.address);


            await expect(tx).to.emit(nft, "VerifierRemoved").withArgs(payload.signer3.address);

            isVerifier = await nft.isVerifier(payload.signer3.address);
            expect(isVerifier).equal(false);
        })
    })
}