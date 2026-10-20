from solution import get_skyline


def test_get_skyline_single_building():
    assert get_skyline([[0, 2, 3]]) == [[0, 3], [2, 0]]


def test_get_skyline_overlapping_buildings():
    buildings = [[2, 9, 10], [3, 7, 15], [5, 12, 12], [15, 20, 10], [19, 24, 8]]
    expected = [
        [2, 10],
        [3, 15],
        [7, 12],
        [12, 0],
        [15, 10],
        [20, 8],
        [24, 0],
    ]
    assert get_skyline(buildings) == expected


def test_get_skyline_empty():
    assert get_skyline([]) == []
