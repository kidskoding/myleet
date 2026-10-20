from solution import soup_servings


def close(a: float, b: float) -> bool:
    return abs(a - b) < 1e-5


def test_soup_servings_fifty():
    assert close(soup_servings(50), 0.625)


def test_soup_servings_hundred():
    assert close(soup_servings(100), 0.71875)


def test_soup_servings_zero():
    assert close(soup_servings(0), 0.5)


def test_soup_servings_tiny_rounds_up():
    assert close(soup_servings(1), 0.625)


def test_soup_servings_huge():
    assert close(soup_servings(10**9), 1.0)


def test_soup_servings_mid():
    assert close(soup_servings(660), 0.9487833306193352)
