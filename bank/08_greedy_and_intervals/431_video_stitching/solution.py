def video_stitching(clips: list[list[int]], time: int) -> int:
    # Time: O(n + time).
    # Space: O(time).
    farthest_from = [0] * (time + 1)
    for start, end in clips:
        if start <= time:
            farthest_from[start] = max(farthest_from[start], end)
    count = 0
    cur_end = 0
    far = 0
    for t in range(time):
        far = max(far, farthest_from[t])
        if t == cur_end:
            if far <= t:
                return -1
            count += 1
            cur_end = far
    return count
