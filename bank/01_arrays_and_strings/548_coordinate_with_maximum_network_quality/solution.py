import math


def best_coordinate(towers: list[list[int]], radius: int) -> list[int]:
    best = [0, 0]
    best_quality = 0
    for x in range(51):
        for y in range(51):
            quality = 0
            for tx, ty, q in towers:
                d = math.hypot(tx - x, ty - y)
                if d <= radius:
                    quality += int(q / (1 + d))
            if quality > best_quality:
                best_quality = quality
                best = [x, y]
    return best
