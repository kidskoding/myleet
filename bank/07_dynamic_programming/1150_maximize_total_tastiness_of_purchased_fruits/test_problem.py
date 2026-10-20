from solution import max_tastiness


def test_max_tastiness_one_coupon():
    assert max_tastiness([10, 20, 20], [5, 8, 8], 20, 1) == 13


def test_max_tastiness_two_coupons():
    assert max_tastiness([10, 15, 7], [5, 8, 20], 10, 2) == 28


def test_max_tastiness_cannot_afford_anything():
    assert max_tastiness([5], [7], 4, 0) == 0


def test_max_tastiness_coupon_rounds_down():
    assert max_tastiness([5], [7], 2, 1) == 7


def test_max_tastiness_free_fruits():
    assert max_tastiness([0, 0], [3, 4], 0, 0) == 7


def test_max_tastiness_coupon_on_the_right_fruit():
    assert max_tastiness([9, 9, 9], [1, 2, 3], 13, 1) == 5
