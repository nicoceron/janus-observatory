import { RuntimeReleaseIdentitySchema } from '@janus/domain/runtime-release';

import releaseIdentityJson from '../../../data/generated/runtime/release-identity.json';

export const releaseIdentity = RuntimeReleaseIdentitySchema.parse(releaseIdentityJson);
