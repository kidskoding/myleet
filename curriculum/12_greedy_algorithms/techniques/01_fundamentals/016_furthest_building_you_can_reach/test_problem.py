from solution import furthest_building


def test_furthest_building_runs_out_of_bricks():
    assert furthest_building([4, 2, 7, 6, 9, 14, 12], 5, 1) == 4


def test_furthest_building_uses_ladders_on_big_gaps():
    assert furthest_building([4, 12, 2, 7, 3, 18, 20, 3, 19], 10, 2) == 7
