from solution import min_set_size


def test_min_set_size_example():
    assert min_set_size([3, 3, 3, 3, 5, 5, 5, 2, 2, 7]) == 2


def test_min_set_size_all_same():
    assert min_set_size([7, 7, 7, 7, 7, 7]) == 1


def test_min_set_size_two_distinct():
    assert min_set_size([1, 9]) == 1


def test_min_set_size_all_distinct():
    assert min_set_size([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) == 5


def test_min_set_size_one_dominant():
    assert min_set_size([1000, 1000, 3, 7]) == 1
