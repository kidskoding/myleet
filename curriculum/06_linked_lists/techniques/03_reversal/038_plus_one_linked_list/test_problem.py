from list_node import ListNode
from solution import plus_one


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_plus_one_no_carry_chain():
    assert to_list(plus_one(build_list([1, 2, 3]))) == [1, 2, 4]


def test_plus_one_all_nines():
    assert to_list(plus_one(build_list([9, 9, 9]))) == [1, 0, 0, 0]


def test_plus_one_single_nine():
    assert to_list(plus_one(build_list([9]))) == [1, 0]


def test_plus_one_partial_carry():
    assert to_list(plus_one(build_list([1, 2, 9]))) == [1, 3, 0]
