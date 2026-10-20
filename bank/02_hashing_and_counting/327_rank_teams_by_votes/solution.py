def rank_teams(votes: list[str]) -> str:
    positions = len(votes[0])
    counts = {team: [0] * positions for team in votes[0]}
    for vote in votes:
        for pos, team in enumerate(vote):
            counts[team][pos] += 1
    ordered = sorted(counts, key=lambda team: (tuple(-c for c in counts[team]), team))
    return "".join(ordered)
