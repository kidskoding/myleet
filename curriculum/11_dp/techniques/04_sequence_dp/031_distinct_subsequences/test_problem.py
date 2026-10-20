from solution import num_distinct


def test_num_distinct_normal():
    assert num_distinct("rabbbit", "rabbit") == 3


def test_num_distinct_no_match():
    assert num_distinct("abc", "d") == 0


def test_num_distinct_empty_target():
    assert num_distinct("abc", "") == 1
