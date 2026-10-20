from solution import preimage_size_fzf


def test_preimage_size_fzf_example_zero():
    assert preimage_size_fzf(0) == 5


def test_preimage_size_fzf_example_skipped():
    assert preimage_size_fzf(5) == 0


def test_preimage_size_fzf_example_three():
    assert preimage_size_fzf(3) == 5


def test_preimage_size_fzf_after_jump():
    assert preimage_size_fzf(6) == 5


def test_preimage_size_fzf_skipped_at_fifty():
    assert preimage_size_fzf(11) == 0


def test_preimage_size_fzf_large():
    assert preimage_size_fzf(1000000000) == 5
