from solution import high_five


def test_high_five_two_students_interleaved():
    items = [[3, 50], [1, 10], [3, 60], [1, 20], [3, 70], [1, 30], [3, 80], [1, 40], [3, 90], [1, 50], [3, 100]]
    assert high_five(items) == [[1, 30], [3, 80]]


def test_high_five_exactly_five_scores():
    assert high_five([[5, 77]] * 5) == [[5, 77]]


def test_high_five_rounds_down():
    assert high_five([[2, 1], [2, 1], [2, 1], [2, 1], [2, 2]]) == [[2, 1]]


def test_high_five_drops_low_scores():
    assert high_five([[4, 0], [4, 100], [4, 100], [4, 100], [4, 100], [4, 100]]) == [[4, 100]]


def test_high_five_sorted_by_id():
    items = [[9, s] for s in (90, 80, 70, 60, 50)] + [[2, s] for s in (10, 20, 30, 40, 50, 5)]
    assert high_five(items) == [[2, 30], [9, 70]]
