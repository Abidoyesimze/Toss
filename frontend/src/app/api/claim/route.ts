import { NextResponse, type NextRequest } from "next/server";
import { BaseError, ContractFunctionRevertedError, isAddress, isHex } from "viem";
import { tossAbi } from "@/lib/abi";
import { TOSS_ADDRESS } from "@/lib/chain";
import { errorMessageFor } from "@/lib/errors";
import {
  lockKey,
  quoteFee,
  rateLimited,
  relayerClient,
  serverPublicClient,
  unlockKey,
} from "@/lib/server/relayer";

export const dynamic = "force-dynamic";

type Body = { claimKey: string; recipient: string; fee: string; deadline: number; sig: string };

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) return bad("Too many requests. Please wait a minute.", 429);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request.");
  }

  const { claimKey, recipient, sig } = body;
  if (!isAddress(claimKey) || !isAddress(recipient) || !isHex(sig) || !/^\d+$/.test(body.fee ?? "")) {
    return bad("Invalid request.");
  }
  if (!Number.isSafeInteger(body.deadline)) return bad("Invalid request.");
  const fee = BigInt(body.fee);
  const deadline = BigInt(body.deadline);

  // The fee is signed by the link key; refuse claims that wouldn't cover our gas.
  const minFee = await quoteFee().catch(() => null);
  if (minFee === null) return bad("Relayer is unavailable right now.", 503);
  if (fee < (minFee * 2n) / 3n) return bad("Fee too low. Please try again.");

  if (!lockKey(claimKey)) return bad("This link is already being claimed.", 409);
  try {
    const client = relayerClient();
    // Simulate first so we never pay gas for a claim that would revert.
    const { request } = await serverPublicClient.simulateContract({
      account: client.account,
      address: TOSS_ADDRESS,
      abi: tossAbi,
      functionName: "claim",
      args: [claimKey, recipient, fee, deadline, sig],
    });
    const hash = await client.writeContract(request);
    const receipt = await serverPublicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") return bad("The claim transaction failed.", 502);
    console.log("claimed", claimKey, hash);
    return NextResponse.json({ hash });
  } catch (err) {
    if (err instanceof BaseError) {
      const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
      const name = revert instanceof ContractFunctionRevertedError ? revert.data?.errorName : undefined;
      if (name) return bad(errorMessageFor(name) ?? name, 422);
    }
    console.error("claim failed", claimKey, err instanceof Error ? err.message.split("\n")[0] : err);
    return bad("Could not submit the claim. Please try again.", 502);
  } finally {
    unlockKey(claimKey);
  }
}
