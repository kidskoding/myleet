from solution import max_distance


def test_max_distance_middle_differs():
    assert max_distance([1, 1, 1, 6, 1, 1, 1]) == 3


def test_max_distance_endpoints_differ():
    assert max_distance([1, 8, 3, 8, 3]) == 4


def test_max_distance_two_houses():
    assert max_distance([0, 1]) == 1


def test_max_distance_only_first_differs():
    assert max_distance([2, 1, 1, 1]) == 3


def test_max_distance_same_endpoints():
    assert max_distance([1, 1, 2, 1, 1]) == 2
