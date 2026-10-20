from list_node import ListNode
from solution import reverse_k_group


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


def test_reverse_k_group_exact():
    head = build_list([1, 2, 3, 4, 5])
    assert to_list(reverse_k_group(head, 2)) == [2, 1, 4, 3, 5]


def test_reverse_k_group_full_group():
    head = build_list([1, 2, 3, 4, 5])
    assert to_list(reverse_k_group(head, 3)) == [3, 2, 1, 4, 5]


def test_reverse_k_group_k_one():
    head = build_list([1, 2, 3])
    assert to_list(reverse_k_group(head, 1)) == [1, 2, 3]
