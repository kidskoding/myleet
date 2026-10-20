from solution import count_arrangement


def test_count_arrangement_single():
    assert count_arrangement(1) == 1


def test_count_arrangement_normal():
    assert count_arrangement(2) == 2


def test_count_arrangement_larger():
    assert count_arrangement(4) == 8
