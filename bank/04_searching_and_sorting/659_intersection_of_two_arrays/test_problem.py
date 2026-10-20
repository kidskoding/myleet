from solution import intersection


def test_intersection_example_one():
    assert sorted(intersection([1, 2, 2, 1], [2, 2])) == [2]


def test_intersection_example_two():
    assert sorted(intersection([4, 9, 5], [9, 4, 9, 8, 4])) == [4, 9]


def test_intersection_disjoint():
    assert intersection([1, 2], [3, 4]) == []


def test_intersection_identical_duplicates():
    assert intersection([1, 1], [1]) == [1]


def test_intersection_zero_values():
    assert sorted(intersection([0, 1000], [1000, 0, 0])) == [0, 1000]
