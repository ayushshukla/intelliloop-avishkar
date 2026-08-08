export interface RegisterRepositoryRequest {
  readonly rootPath: string;
}

export interface RepositoryResource {
  readonly registrationId: string;
  readonly projectId: string;
  readonly repositoryKind: "LOCAL_GIT";
  readonly accessMode: "READ_ONLY";
  readonly registeredAtUtc: string;
}

export interface RepositoryResponse {
  readonly apiVersion: "v1";
  readonly repository: RepositoryResource;
}

interface RepositoryContractSource {
  readonly registrationId: string;
  readonly projectId: string;
  readonly accessMode: "READ_ONLY";
  readonly registeredAtUtc: string;
}

export function toRepositoryResource(
  repository: RepositoryContractSource
): RepositoryResource {
  return {
    registrationId: repository.registrationId,
    projectId: repository.projectId,
    repositoryKind: "LOCAL_GIT",
    accessMode: repository.accessMode,
    registeredAtUtc: repository.registeredAtUtc
  };
}

export function createRepositoryResponse(
  repository: RepositoryContractSource
): RepositoryResponse {
  return { apiVersion: "v1", repository: toRepositoryResource(repository) };
}
