from solution import mask_pii


def test_mask_pii_email():
    assert mask_pii("LeetCode@LeetCode.com") == "l*****e@leetcode.com"


def test_mask_pii_short_name_email():
    assert mask_pii("AB@qq.com") == "a*****b@qq.com"


def test_mask_pii_local_phone():
    assert mask_pii("1(234)567-890") == "***-***-7890"


def test_mask_pii_two_digit_country_code():
    assert mask_pii("86-(10)12345678") == "+**-***-***-5678"


def test_mask_pii_three_digit_country_code():
    assert mask_pii("+(501321)-50-23431") == "+***-***-***-3431"
