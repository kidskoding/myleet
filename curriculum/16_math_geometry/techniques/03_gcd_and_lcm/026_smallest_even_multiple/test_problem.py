from solution import smallest_even_multiple


def test_smallest_even_multiple_odd():
    assert smallest_even_multiple(5) == 10


def test_smallest_even_multiple_even():
    assert smallest_even_multiple(6) == 6
