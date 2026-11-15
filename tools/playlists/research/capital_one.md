# capital_one live coding research

Counts from reports checked 2026-11-15. Each problem is counted once, in one topic.

| Topic                 | Count | Example problems                                                                   |
| --------------------- | ----- | ---------------------------------------------------------------------------------- |
| data-structure design | 1     | banking system: create account, deposit, transfer, then top N accounts by activity |
| two pointers          | 1     | sum of two integers closest to zero                                                |
| arrays and strings    | 1     | "LeetCode easy" questions (new grad, no problem named)                             |

The banking system is one problem, but five separate reports describe it word for word (Sep 2024, Sep 2025, Jul 2026, Aug 2026, Sep 2026), and one more names "a medium LeetCode problem with 2 extensions". Its last part (top N accounts by activity) is a top-k question, so heaps and sorting come next.

## Reports

- https://leetcode.com/discuss/post/6667919/ (Sep 2024, Plano TX): banking system with a top-k follow-up, "similar to LC 2043"
- https://leetcode.com/discuss/post/7203408/ (Sep 2025, location not shown): bank class, then withdrawals and transfers, then topKAccounts by activity
- https://leetcode.com/discuss/post/8429221/ (Jul 2026, McLean VA): same Power Day questions "word for word" as earlier posts
- https://leetcode.com/discuss/post/5033011/ (Apr 2024, US): one medium LeetCode problem with two extensions
- https://prachub.com/interview-experiences/capital-one-lead-software-engineer-interview-experience-power-day-across-two-days (Aug 2026, location not shown): banking system in three parts, inputs as string arrays
- https://prachub.com/interview-experiences/capital-one-software-engineer-interview-experience-power-day-with-case-behavioral-coding-and-system-design (Sep 2026, location not shown): banking system in three parts
- https://prachub.com/interview-experiences/capital-one-new-grad-software-engineer-interview-experience-power-day-with-behavioral-case-study-and-agentic-coding (Oct 2026, location not shown): agentic coding round, fix bugs and add a feature in a React and FastAPI codebase; no algorithm problem
- https://leetcode.com/discuss/interview-question/1277236/capital-one-power-day-questions/ (Jun 2021, location not shown): sum of two integers closest to zero
- https://leetcode.com/discuss/post/4875572/ (Mar 2024, McLean VA, new grad TDP): "questions were leetcode easy"

The CodeSignal online assessment is left out on purpose. So is the case round, which has candidates debug a short rule-checking function (`&&` against `||`, off-by-one boundaries) without writing new code.

## Estimate

- Live coding share: one of the four Power Day rounds is coding in every report (about 25% of rounds). The case round sometimes includes reading and fixing code, and some 2026 loops swap the coding round for an AI-assisted "agentic coding" round.
- Topics in those rounds: data-structure design 1 problem (reported 5 times), two pointers 1, arrays and strings 1.
- Reports: 9, 4 of them US, the rest location not shown.
- Confidence: medium. The coding round is very consistent, but there is only one recurring problem.

## Conclusion

The set leads with Simple Bank System (LC 2043, the closest public match) and other class-design problems, then hash-map and top-k practice for the "top N accounts" follow-up, and a short two-pointer tail for the closest-to-zero question.
