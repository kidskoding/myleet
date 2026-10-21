def most_popular_creator(
    creators: list[str], ids: list[str], views: list[int]
) -> list[list[str]]:
    total: dict[str, int] = {}
    best: dict[str, tuple[int, str]] = {}
    for creator, video_id, view in zip(creators, ids, views):
        total[creator] = total.get(creator, 0) + view
        if creator not in best or view > best[creator][0] or (
            view == best[creator][0] and video_id < best[creator][1]
        ):
            best[creator] = (view, video_id)
    max_total = max(total.values())
    return [[c, best[c][1]] for c in total if total[c] == max_total]
