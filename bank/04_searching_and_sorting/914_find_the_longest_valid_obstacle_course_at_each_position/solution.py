from bisect import bisect_right


def longest_obstacle_course_at_each_position(obstacles: list[int]) -> list[int]:
    tails: list[int] = []
    result = []
    for height in obstacles:
        pos = bisect_right(tails, height)
        if pos == len(tails):
            tails.append(height)
        else:
            tails[pos] = height
        result.append(pos + 1)
    return result
