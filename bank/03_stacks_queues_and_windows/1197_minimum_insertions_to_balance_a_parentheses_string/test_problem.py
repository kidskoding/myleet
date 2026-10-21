from solution import min_insertions


def test_min_insertions_example_one():
    assert min_insertions("(()))") == 1


def test_min_insertions_example_two():
    assert min_insertions("())") == 0


def test_min_insertions_example_three():
    assert min_insertions("))())(") == 3


def test_min_insertions_empty():
    assert min_insertions("") == 0


def test_min_insertions_only_open():
    assert min_insertions("(((") == 6
