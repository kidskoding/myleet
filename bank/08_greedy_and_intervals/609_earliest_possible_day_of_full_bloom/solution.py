def earliest_full_bloom(plant_time: list[int], grow_time: list[int]) -> int:
    day = finish = 0
    for grow, plant in sorted(zip(grow_time, plant_time), reverse=True):
        day += plant
        finish = max(finish, day + grow)
    return finish
