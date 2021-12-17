
import React, {
    createContext,
    useContext,
    useReducer,
    useMemo,
    useCallback,
    useEffect,
} from "react";

import { ethers } from "ethers";
import { useWallet } from "use-wallet";
import {
    providers, tokenContract, presaleContract
} from "../contracts";

import { delay, handleAlert, toBigNum, fromBigNum } from "../utils/utils";
import { NotificationManager } from "react-notifications";

const BlockchainContext = createContext();

export function useBlockchainContext() {
    return useContext(BlockchainContext);
}

function reducer(state, { type, payload }) {
    return {
        ...state,
        [type]: payload,
    };
}

const INIT_STATE = {
    signer: "",
    provider: "",
    tokenBalance: 0,
    ethBalance: 0,
    price: 3000,

};

export default function Provider({ children }) {
    const wallet = useWallet();
    const [state, dispatch] = useReducer(reducer, INIT_STATE);

    // set signer balance
    useEffect(() => {
        const getSigner = async () => {
            if (wallet.status === "connected") {
                const provider = new ethers.providers.Web3Provider(
                    wallet.ethereum
                );
                const signer = await provider.getSigner();
                dispatch({
                    type: "signer",
                    payload: signer,
                });

                dispatch({
                    type: "provider",
                    payload: provider,
                });

                try {
                    await checkBalance();
                } catch (err) {
                    console.log("balance check error")
                }
            }
        };
        getSigner();
    }, [wallet.status]);

    const checkBalance = async () => {
        try {
            var signedTokenContract = tokenContract.connect(state.signer);
            var tokenBalance = fromBigNum(await signedTokenContract.balanceOf(signer.address), 18);

            var ethBalance = fromBigNum(await state.provider.getBalance(signer.address), 18);

            dispatch({
                type: "tokenBalance",
                payload: tokenBalance
            });

            dispatch({
                type: "ethBalance",
                payload: ethBalance
            })

            return {
                tokenBalance,
                ethBalance
            }
        } catch (err) {
            console.log(err);
            NotificationManager.error("Check balance error");

            dispatch({
                type: "tokenBalance",
                payload: 0
            });
            dispatch({
                type: "ethBalance",
                payload: 0
            });

            return {
                tokenBalance: 0,
                ethBalance: 0
            }
        }
    }

    const getTerms = async () => {
        try {
            var terms = fromBigNum(await presaleContract.terms);
            dispatch({
                type: "terms",
                payload: terms
            })
        } catch (err) {
            console.log(err);
        }
    }

    useEffect(() => {
        getTerms();
    }, []);

    //actions
    const buy = async (amount) => {
        try {
            var tx = await presaleContract.buy({ value: toBigNum(amount, 18) });
            await tx.wait();
            NotificationManager.success("Buy Success");
        } catch (err) {
            NotificationManager.error("Buy error");
        }
    }

    return (
        <BlockchainContext.Provider
            value={useMemo(
                () => [
                    state,
                    {
                        checkBalance,
                        buy
                    }
                ],
                [state]
            )}>
            {children}
        </BlockchainContext.Provider>
    );
}
