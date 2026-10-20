from solution import AuthenticationManager


def test_authentication_manager_full_sequence():
    auth = AuthenticationManager(5)
    auth.renew("aaa", 1)
    auth.generate("aaa", 2)
    assert auth.count_unexpired_tokens(6) == 1
    auth.generate("bbb", 7)
    auth.renew("aaa", 8)
    auth.renew("bbb", 10)
    assert auth.count_unexpired_tokens(15) == 0


def test_authentication_manager_expires_at_exact_time():
    auth = AuthenticationManager(3)
    auth.generate("t", 1)
    assert auth.count_unexpired_tokens(3) == 1
    assert auth.count_unexpired_tokens(4) == 0


def test_authentication_manager_renew_extends():
    auth = AuthenticationManager(10)
    auth.generate("t", 0)
    auth.renew("t", 9)
    assert auth.count_unexpired_tokens(18) == 1
    assert auth.count_unexpired_tokens(19) == 0


def test_authentication_manager_renew_unknown_token_ignored():
    auth = AuthenticationManager(5)
    auth.renew("ghost", 1)
    assert auth.count_unexpired_tokens(1) == 0


def test_authentication_manager_counts_several():
    auth = AuthenticationManager(4)
    auth.generate("a", 1)
    auth.generate("b", 2)
    auth.generate("c", 3)
    assert auth.count_unexpired_tokens(4) == 3
    assert auth.count_unexpired_tokens(5) == 2
    auth.renew("a", 5)
    assert auth.count_unexpired_tokens(6) == 1
