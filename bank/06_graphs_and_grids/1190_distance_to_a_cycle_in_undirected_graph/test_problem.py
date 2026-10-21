from solution import distance_to_cycle


def test_distance_to_cycle_example_one():
    assert distance_to_cycle(
        7, [[1, 2], [2, 4], [4, 3], [3, 1], [0, 1], [5, 2], [6, 5]]
    ) == [1, 0, 0, 0, 0, 1, 2]


def test_distance_to_cycle_example_two():
    assert distance_to_cycle(
        9, [[0, 1], [1, 2], [0, 2], [2, 6], [6, 7], [6, 8], [0, 3], [3, 4], [3, 5]]
    ) == [0, 0, 0, 1, 2, 2, 1, 2, 2]


def test_distance_to_cycle_triangle_with_tail():
    assert distance_to_cycle(4, [[0, 1], [1, 2], [2, 0], [2, 3]]) == [0, 0, 0, 1]


def test_distance_to_cycle_pure_cycle():
    assert distance_to_cycle(3, [[0, 1], [1, 2], [2, 0]]) == [0, 0, 0]
