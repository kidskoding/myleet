from solution import base_neg2


def test_base_neg2_two():
    assert base_neg2(2) == "110"


def test_base_neg2_three():
    assert base_neg2(3) == "111"


def test_base_neg2_four():
    assert base_neg2(4) == "100"


def test_base_neg2_zero():
    assert base_neg2(0) == "0"


def test_base_neg2_one():
    assert base_neg2(1) == "1"


def test_base_neg2_six():
    assert base_neg2(6) == "11010"


def test_base_neg2_large_value_round_trips():
    digits = base_neg2(10**9)
    assert digits[0] == "1"
    assert sum(int(d) * (-2) ** i for i, d in enumerate(reversed(digits))) == 10**9
