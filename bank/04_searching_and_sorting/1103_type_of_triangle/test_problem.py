from solution import triangle_type


def test_triangle_type_equilateral():
    assert triangle_type([3, 3, 3]) == "equilateral"


def test_triangle_type_scalene():
    assert triangle_type([3, 4, 5]) == "scalene"


def test_triangle_type_isosceles():
    assert triangle_type([3, 4, 3]) == "isosceles"


def test_triangle_type_degenerate_is_none():
    assert triangle_type([1, 2, 3]) == "none"


def test_triangle_type_two_equal_but_too_short():
    assert triangle_type([2, 5, 2]) == "none"
