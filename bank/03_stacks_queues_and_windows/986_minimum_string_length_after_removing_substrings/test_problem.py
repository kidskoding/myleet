from solution import min_length


def test_min_length_example_one():
    assert min_length("ABFCACDB") == 2


def test_min_length_nothing_to_remove():
    assert min_length("ACBBD") == 5


def test_min_length_cascade():
    assert min_length("ACDB") == 0


def test_min_length_nested_pairs():
    assert min_length("AABB") == 0


def test_min_length_wrong_order():
    assert min_length("BA") == 2
