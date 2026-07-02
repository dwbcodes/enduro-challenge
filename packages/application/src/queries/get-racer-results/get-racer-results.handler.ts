import { Result, ResultRepository } from '@enduro/domain';
import { GetRacerResultsQuery } from './get-racer-results.query';

export class GetRacerResultsHandler {
  constructor(private readonly resultRepository: ResultRepository) {}

  async execute(query: GetRacerResultsQuery): Promise<Result[]> {
    return this.resultRepository.findByRacer(query.racerId);
  }
}
