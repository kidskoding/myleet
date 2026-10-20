from solution import bulb_switch


def test_bulb_switch_three():
    assert bulb_switch(3) == 1


def test_bulb_switch_zero():
    assert bulb_switch(0) == 0


def test_bulb_switch_one():
    assert bulb_switch(1) == 1


def test_bulb_switch_just_below_square():
    assert bulb_switch(99) == 9


def test_bulb_switch_perfect_square():
    assert bulb_switch(100) == 10


def test_bulb_switch_large():
    assert bulb_switch(10**9) == 31622
