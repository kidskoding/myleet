from solution import intersect


def test_intersect_with_repeats():
    assert sorted(intersect([1, 2, 2, 1], [2, 2])) == [2, 2]


def test_intersect_keeps_multiplicity():
    assert sorted(intersect([4, 9, 5], [9, 4, 9, 8, 4])) == [4, 9]


def test_intersect_no_overlap():
    assert intersect([1, 2], [3, 4]) == []


def test_intersect_first_array_limits_the_count():
    assert intersect([2], [2, 2, 2]) == [2]


def test_intersect_second_array_limits_the_count():
    assert intersect([2, 2, 2], [2]) == [2]


def test_intersect_empty_first():
    assert intersect([], [1, 2]) == []


def test_intersect_empty_second():
    assert intersect([1, 2], []) == []
