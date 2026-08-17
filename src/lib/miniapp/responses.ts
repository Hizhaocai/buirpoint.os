import { NextResponse } from "next/server";
import { MINIAPP_CONTRACT_VERSION } from "@/lib/miniapp/contract";

export const MINIAPP_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

export type MiniappErrorCode = "INVALID_QUERY" | "NOT_FOUND" | "INTERNAL_ERROR";

const baseHeaders = {
  "Cache-Control": MINIAPP_CACHE_CONTROL,
  "X-Content-Type-Options": "nosniff",
};

export function miniappSuccess<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(
    { data, meta: { contract_version: MINIAPP_CONTRACT_VERSION } },
    { status: init?.status ?? 200, headers: baseHeaders },
  );
}

export function miniappError(code: MiniappErrorCode, message: string, status: 400 | 404 | 500) {
  return NextResponse.json(
    { error: { code, message }, meta: { contract_version: MINIAPP_CONTRACT_VERSION } },
    { status, headers: { ...baseHeaders, "Cache-Control": "no-store" } },
  );
}

export function logMiniappApiError(route: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`[miniapp-api] ${route}: ${message}`);
}
