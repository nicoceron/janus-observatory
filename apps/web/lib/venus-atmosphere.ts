import { PublishedNumericTableSchema } from '@janus/domain/published-table';

import venusAtmosphereJson from '../../../data/generated/runtime/venus-atmosphere.json';

export const venusAtmosphere = PublishedNumericTableSchema.parse(venusAtmosphereJson);
