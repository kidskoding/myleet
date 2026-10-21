from solution import distinct_integers


def test_distinct_integers_five():
    assert distinct_integers(5) == 4


def test_distinct_integers_three():
    assert distinct_integers(3) == 2


def test_distinct_integers_one():
    assert distinct_integers(1) == 1


def test_distinct_integers_two():
    assert distinct_integers(2) == 1


def test_distinct_integers_hundred():
    assert distinct_integers(100) == 99
