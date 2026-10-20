from solution import min_cost_good_caption


def test_min_cost_good_caption_example_alternating():
    assert min_cost_good_caption("cdcd") == "cccc"


def test_min_cost_good_caption_example_middle_letter():
    assert min_cost_good_caption("aca") == "aaa"


def test_min_cost_good_caption_too_short():
    assert min_cost_good_caption("bc") == ""
    assert min_cost_good_caption("a") == ""


def test_min_cost_good_caption_already_good():
    assert min_cost_good_caption("bbbaaa") == "bbbaaa"


def test_min_cost_good_caption_median_letter():
    assert min_cost_good_caption("abc") == "bbb"


def test_min_cost_good_caption_two_blocks():
    assert min_cost_good_caption("aabbccdd") == "aaaacccc"


def test_min_cost_good_caption_tie_prefers_smaller():
    assert min_cost_good_caption("dcbaabcd") == "bbbbbccc"
