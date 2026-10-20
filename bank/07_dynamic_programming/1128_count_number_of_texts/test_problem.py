from solution import count_texts


def test_count_texts_two_groups():
    assert count_texts("22233") == 8


def test_count_texts_long_run_modulo():
    assert count_texts("222222222222222222222222222222222222") == 82876089


def test_count_texts_single_press():
    assert count_texts("2") == 1


def test_count_texts_three_letter_key_run():
    assert count_texts("2222") == 7


def test_count_texts_four_letter_key_run():
    assert count_texts("7777") == 8


def test_count_texts_all_different_keys():
    assert count_texts("23456") == 1
