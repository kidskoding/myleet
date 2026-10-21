from solution import sum_even_after_queries


def test_sum_even_after_queries_example_one():
    assert sum_even_after_queries([1, 2, 3, 4], [[1, 0], [-3, 1], [-4, 0], [2, 3]]) == [8, 6, 2, 4]


def test_sum_even_after_queries_example_two():
    assert sum_even_after_queries([1], [[4, 0]]) == [0]


def test_sum_even_after_queries_stay_even():
    assert sum_even_after_queries([2, 4], [[2, 0]]) == [8]


def test_sum_even_after_queries_all_odd():
    assert sum_even_after_queries([1, 3], [[1, 0], [1, 1]]) == [2, 6]
