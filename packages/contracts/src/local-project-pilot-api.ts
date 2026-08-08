export const LOCAL_PROJECT_PILOT_API_VERSION = "v1" as const;

export type LocalProjectPilotCapabilityState =
  | "READY"
  | "DISABLED"
  | "CONFIGURATION_REQUIRED";

export interface LocalProjectPilotCapabilityResponse {
  readonly apiVersion: typeof LOCAL_PROJECT_PILOT_API_VERSION;
  readonly capability: {
    readonly state: LocalProjectPilotCapabilityState;
    readonly enabled: boolean;
    readonly configured: boolean;
    readonly localOnly: true;
    readonly accessMode: "READ_ONLY";
    readonly externalAi: "OFF";
  };
}

export interface LocalProjectPreflightRequest {
  readonly rootPath: string;
}

export type LocalProjectPreflightFailureReason =
  | "FEATURE_DISABLED"
  | "CONFIGURATION_REQUIRED"
  | "PATH_NOT_AUTHORIZED"
  | "PATH_INVALID"
  | "REPOSITORY_NOT_FOUND"
  | "REPOSITORY_NOT_GIT"
  | "UNSAFE_LINK"
  | "COMMIT_UNAVAILABLE"
  | "GIT_TIMEOUT"
  | "GIT_UNAVAILABLE"
  | "INTEGRITY_CHECK_FAILED";

export interface LocalProjectSafeRepository {
  readonly displayName: string;
  readonly repositoryState: "RECOGNIZED_GIT";
  readonly headState: "ATTACHED" | "DETACHED";
  readonly ref: string;
  readonly exactCommit: string;
  readonly commitTimestampUtc: string;
  readonly uncommittedChanges: "NONE" | "EXCLUDED";
  readonly excludedChangeCount: number;
  readonly captureReady: true;
  readonly accessMode: "READ_ONLY";
  readonly sourcePersistence: "SOURCE_FREE";
}

export type LocalProjectPreflightResponse =
  | {
      readonly apiVersion: typeof LOCAL_PROJECT_PILOT_API_VERSION;
      readonly preflight: {
        readonly status: "READY";
        readonly repository: LocalProjectSafeRepository;
      };
    }
  | {
      readonly apiVersion: typeof LOCAL_PROJECT_PILOT_API_VERSION;
      readonly preflight: {
        readonly status: "REJECTED";
        readonly reason: LocalProjectPreflightFailureReason;
        readonly recovery: string;
      };
    };

export interface LocalProjectContextResponse {
  readonly apiVersion: typeof LOCAL_PROJECT_PILOT_API_VERSION;
  readonly projectId: string;
  readonly repository: LocalProjectSafeRepository;
}
