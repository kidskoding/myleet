import math


def visible_points(points: list[list[int]], angle: int, location: list[int]) -> int:
    ox, oy = location
    same = 0
    angles = []
    for x, y in points:
        if x == ox and y == oy:
            same += 1
        else:
            angles.append(math.degrees(math.atan2(y - oy, x - ox)))
    angles.sort()
    angles += [a + 360 for a in angles]
    best = left = 0
    for right in range(len(angles)):
        while angles[right] - angles[left] > angle + 1e-9:
            left += 1
        best = max(best, right - left + 1)
    return same + min(best, len(angles) // 2)
