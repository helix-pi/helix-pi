/* globals describe, it */

const rankIndividuals = require('../app/rank-individuals');

const assert = require('assert');

describe('rankIndividuals', () => {
  it('assigns a rank to each individual based on their fitness', () => {
    const individuals = [
      {fitness: {weightedScore: 750}, expectedRank: 0.48387},
      {fitness: {weightedScore: 500}, expectedRank: 0.80645},
      {fitness: {weightedScore: 300}, expectedRank: 1}
    ];

    rankIndividuals(individuals);

    assert.deepEqual(
      individuals.map(i => i.rank.toFixed(5)),
      individuals.map(i => i.expectedRank.toFixed(5))
    );
  });
});
